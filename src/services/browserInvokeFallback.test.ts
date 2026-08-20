import { describe, expect, it } from 'vitest'

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
})
