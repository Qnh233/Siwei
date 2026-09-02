import React from 'react'

import * as api from '../../services/siweiApi'
import type { LibraryDocumentItem } from '../../types/library'
import {
  findDocumentReferenceQuery,
  type DocumentReferenceQuery,
} from './documentReferences'

export function useDocumentReferenceAutocomplete(currentDocumentId: string | null) {
  const [query, setQuery] = React.useState<DocumentReferenceQuery | null>(null)
  const [items, setItems] = React.useState<LibraryDocumentItem[]>([])
  const [activeIndex, setActiveIndex] = React.useState(0)
  const [isLoading, setIsLoading] = React.useState(false)

  const update = React.useCallback((text: string, caret: number) => {
    const next = findDocumentReferenceQuery(text, caret)
    setQuery(next)
    setActiveIndex(0)
    if (!next) setItems([])
    return next
  }, [])

  const close = React.useCallback(() => {
    setQuery(null)
    setItems([])
    setActiveIndex(0)
  }, [])

  React.useEffect(() => {
    if (!query) return
    let cancelled = false
    setIsLoading(true)
    const timer = window.setTimeout(async () => {
      try {
        const page = await api.queryLibraryDocs({
          limit: 20,
          offset: 0,
          sortBy: query.query.trim() ? 'title' : 'updatedAt',
          sortDirection: query.query.trim() ? 'asc' : 'desc',
          status: 'ready',
          keyword: query.query.trim() || undefined,
        })
        if (!cancelled) {
          setItems(page.items.filter((item) => item.documentId !== currentDocumentId).slice(0, 8))
          setActiveIndex(0)
        }
      } catch {
        if (!cancelled) setItems([])
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }, 100)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [currentDocumentId, query])

  const handleKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!query) return null
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => items.length === 0 ? 0 : (index + 1) % items.length)
      return 'handled' as const
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => items.length === 0 ? 0 : (index - 1 + items.length) % items.length)
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

  return { activeIndex, close, handleKeyDown, isLoading, items, query, update }
}
