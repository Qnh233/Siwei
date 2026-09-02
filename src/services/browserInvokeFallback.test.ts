import { describe, expect, it } from 'vitest'

import type { OutlineDocument } from '../types/document'
import type { LibraryDocumentItem, LibraryPage } from '../types/library'
import { DEFAULT_SETTINGS } from '../types/settings'
import { browserInvokeFallback } from './browserInvokeFallback'

describe('browserInvokeFallback document library lifecycle', () => {
  it('allocates unique sanitized document paths inside the configured library', async () => {
    await browserInvokeFallback('update_settings', {
      settings: { ...DEFAULT_SETTINGS, documentLibraryPath: '/Virtual/Siwei' },
    })

    const first = await browserInvokeFallback<string>('prepare_new_document_path', {
      title: ' 项目:A/B? ',
    })
    const second = await browserInvokeFallback<string>('prepare_new_document_path', {
      title: ' 项目:A/B? ',
    })

    expect(first).toBe('/Virtual/Siwei/项目 A B.siwei.json')
    expect(second).toBe('/Virtual/Siwei/项目 A B (2).siwei.json')
  })

  it('indexes a newly saved fallback document into the library', async () => {
    await browserInvokeFallback('update_settings', {
      settings: { ...DEFAULT_SETTINGS, documentLibraryPath: '/Virtual/Library' },
    })
    const doc = await browserInvokeFallback<{ title: string }>('new_document')
    const path = await browserInvokeFallback<string>('prepare_new_document_path', { title: doc.title })

    await browserInvokeFallback('save_document', { path, doc })
    await browserInvokeFallback('refresh_library_doc', { path })
    const page = await browserInvokeFallback<{ items: Array<{ path: string }> }>('query_library_docs', {
      query: { limit: 50, offset: 0 },
    })

    expect(page.items.some((item) => item.path === path)).toBe(true)
  })

  it('creates distinct document ids and filters indexed documents by keyword', async () => {
    const first = await browserInvokeFallback<OutlineDocument>('new_document')
    const second = await browserInvokeFallback<OutlineDocument>('new_document')
    expect(first.id).not.toBe(second.id)

    await browserInvokeFallback('save_document', {
      path: '/Virtual/Library/reference-target.siwei.json',
      doc: { ...first, title: '引用目标', root: { ...first.root, text: '引用目标' } },
    })
    await browserInvokeFallback('refresh_library_doc', { path: '/Virtual/Library/reference-target.siwei.json' })
    const page = await browserInvokeFallback<LibraryPage<LibraryDocumentItem>>('query_library_docs', {
      query: { limit: 20, offset: 0, status: 'ready', keyword: '引用目标', sortBy: 'title', sortDirection: 'asc' },
    })

    expect(page.items.map((item) => item.title)).toContain('引用目标')
  })

  it('loads the saved document body by path so browser reference navigation can switch documents', async () => {
    const first = await browserInvokeFallback<{ id: string; title: string }>('new_document')
    const firstPath = '/Virtual/Library/first.siwei.json'
    await browserInvokeFallback('save_document', {
      path: firstPath,
      doc: { ...first, title: '第一文档', root: { ...(first as any).root, text: '第一文档' } },
    })

    const second = await browserInvokeFallback<OutlineDocument>('new_document')
    await browserInvokeFallback('save_document', {
      path: '/Virtual/Library/second.siwei.json',
      doc: { ...second, title: '第二文档', root: { ...second.root, text: '第二文档' } },
    })

    const loaded = await browserInvokeFallback<OutlineDocument>('load_document', { path: firstPath })
    expect(loaded.title).toBe('第一文档')
    expect(loaded.id).toBe(first.id)
  })
})
