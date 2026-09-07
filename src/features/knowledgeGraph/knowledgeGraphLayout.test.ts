import { describe, expect, it } from 'vitest'
import type { LibraryGraphResult } from '../../types/library'
import { buildKnowledgeGraphElements, computeKnowledgeGraphHops } from './knowledgeGraphLayout'

const graphResult = (overrides: Partial<LibraryGraphResult> = {}): LibraryGraphResult => ({
  rootDocumentId: 'doc-source',
  nodes: [
    { documentId: 'doc-source', title: '来源', path: 'C:/docs/source.siwei.json', status: 'ready' },
    { documentId: 'doc-target', title: '目标', path: 'C:/docs/target.siwei.json', status: 'ready' },
  ],
  edges: [
    {
      referenceId: 'ref-1',
      sourceDocumentId: 'doc-source',
      sourceNodeId: 'node-1',
      sourceOccurrence: 0,
      targetDocumentId: 'doc-target',
      targetPath: 'C:/docs/target.siwei.json',
      label: '目标',
    },
  ],
  ...overrides,
})

describe('buildKnowledgeGraphElements', () => {
  it('maps one-hop graph results into positioned React Flow nodes and edges', () => {
    const result = buildKnowledgeGraphElements(graphResult(), '当前文档')

    expect(result.nodes).toHaveLength(2)
    expect(result.edges).toMatchObject([
      { id: 'ref-1', source: 'doc-source', target: 'doc-target', type: 'straight' },
    ])
    expect(result.nodes.find((node) => node.id === 'doc-source')?.data).toMatchObject({ isRoot: true, hop: 0, degree: 1 })
    expect(result.nodes.find((node) => node.id === 'doc-target')?.data).toMatchObject({ openable: true, hop: 1, degree: 1 })
    expect(result.nodes.find((node) => node.id === 'doc-source')?.data.radius).toBeGreaterThan(
      result.nodes.find((node) => node.id === 'doc-target')?.data.radius ?? 0,
    )
    result.nodes.forEach((node) => {
      expect(Number.isFinite(node.position.x)).toBe(true)
      expect(Number.isFinite(node.position.y)).toBe(true)
    })
  })

  it('computes hop distance across multiple document references', () => {
    const result = graphResult({
      nodes: [
        { documentId: 'doc-source', title: 'A', path: 'A.siwei.json', status: 'ready' },
        { documentId: 'doc-target', title: 'B', path: 'B.siwei.json', status: 'ready' },
        { documentId: 'doc-third', title: 'C', path: 'C.siwei.json', status: 'ready' },
      ],
      edges: [
        ...graphResult().edges,
        {
          referenceId: 'ref-2',
          sourceDocumentId: 'doc-target',
          sourceNodeId: 'node-2',
          sourceOccurrence: 0,
          targetDocumentId: 'doc-third',
          targetPath: 'C.siwei.json',
          label: 'C',
        },
      ],
    })

    const hops = computeKnowledgeGraphHops(result)
    expect(hops.get('doc-source')).toBe(0)
    expect(hops.get('doc-target')).toBe(1)
    expect(hops.get('doc-third')).toBe(2)
    expect(buildKnowledgeGraphElements(result, 'A').nodes.find((node) => node.id === 'doc-third')?.data.hop).toBe(2)
  })

  it('keeps missing targets visible and synthesizes a root node when it is not indexed', () => {
    const result = buildKnowledgeGraphElements(graphResult({
      nodes: [{ documentId: 'doc-target', title: '未入库目标', path: '', status: undefined }],
    }), '当前标题')

    expect(result.nodes.find((node) => node.id === 'doc-source')?.data).toMatchObject({
      title: '当前标题',
      isRoot: true,
    })
    expect(result.nodes.find((node) => node.id === 'doc-target')?.data).toMatchObject({
      status: undefined,
      openable: false,
    })
  })
})
