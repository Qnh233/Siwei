import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { LibraryDocumentItem } from '../../../types/library'
import { LibraryDocumentsView } from './LibraryDocumentsView'

const rootDoc: LibraryDocumentItem = {
  documentId: 'imported',
  title: '导入文档',
  path: 'D:/Notes/imported.siwei.json',
  updatedAt: 1,
  indexedAt: 1,
  nodeCount: 1,
  taskCount: 0,
  uncheckedTaskCount: 0,
  tags: [],
  status: 'ready',
}

describe('LibraryDocumentsView', () => {
  it('shows the configured library root as a visible folder even for root documents', () => {
    render(
      <LibraryDocumentsView
        docs={[rootDoc]}
        libraryRoot="D:/Notes"
        directoryPaths={[]}
        hasMore={false}
        statusFilter="all"
        keyword=""
        sortBy="updatedAt"
        onStatusFilterChange={vi.fn()}
        onKeywordChange={vi.fn()}
        onSortByChange={vi.fn()}
        onReload={vi.fn()}
        onLoadMore={vi.fn()}
        onOpen={vi.fn()}
        onRefresh={vi.fn()}
        onOpenLocation={vi.fn()}
        onRemove={vi.fn()}
        onRemoveMissing={vi.fn()}
      />,
    )

    expect(screen.getByText('Notes')).toBeInTheDocument()
    expect(screen.getByText('D:/Notes')).toBeInTheDocument()
    expect(screen.getByText('导入文档')).toBeInTheDocument()
  })

  it('shows empty filesystem subfolders without indexed documents', () => {
    render(
      <LibraryDocumentsView
        docs={[]}
        libraryRoot="D:/Notes"
        directoryPaths={['Projects', 'Projects/Archive']}
        hasMore={false}
        statusFilter="all"
        keyword=""
        sortBy="updatedAt"
        onStatusFilterChange={vi.fn()}
        onKeywordChange={vi.fn()}
        onSortByChange={vi.fn()}
        onReload={vi.fn()}
        onLoadMore={vi.fn()}
        onOpen={vi.fn()}
        onRefresh={vi.fn()}
        onOpenLocation={vi.fn()}
        onRemove={vi.fn()}
        onRemoveMissing={vi.fn()}
      />,
    )

    expect(screen.getByText('Projects')).toBeInTheDocument()
    expect(screen.getByText('Archive')).toBeInTheDocument()
  })

})
