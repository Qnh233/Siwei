import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import type { OutlineDocument } from '../../types/document'
import { RecallMode } from './RecallMode'

const now = Date.parse('2026-01-01T00:00:00.000Z')
const doc: OutlineDocument = {
  id: 'doc-1',
  title: '测试文档',
  version: 1,
  createdAt: now,
  updatedAt: now,
  root: {
    id: 'root',
    text: '父节点',
    createdAt: now,
    updatedAt: now,
    children: [
      {
        id: 'a',
        text: '子节点 A',
        createdAt: now,
        updatedAt: now,
        children: [{ id: 'a1', text: '孙节点 A1', createdAt: now, updatedAt: now, children: [] }],
      },
      { id: 'b', text: '子节点 B', createdAt: now, updatedAt: now, children: [] },
    ],
  },
}

describe('RecallMode', () => {
  beforeEach(() => window.localStorage.clear())

  it('renders a presentation-style tree with structural hints while answers stay hidden', () => {
    render(<RecallMode document={doc} onClose={() => undefined} />)

    expect(screen.getByText('演示模式')).toBeInTheDocument()
    expect(screen.getByText('2 个直接子节点')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '回忆树' })).toBeInTheDocument()
    expect(screen.getByText('1 个下级')).toBeInTheDocument()
    expect(screen.getByText('叶子节点')).toBeInTheDocument()
    expect(screen.queryByText('子节点 A')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^想起来了/ })).not.toBeInTheDocument()
  })

  it('reveals children progressively and shows colored rating buttons only after the layer is complete', () => {
    render(<RecallMode document={doc} onClose={() => undefined} />)

    fireEvent.click(screen.getByRole('button', { name: '揭示一个' }))
    expect(screen.getByText('子节点 A')).toBeInTheDocument()
    expect(screen.queryByText('子节点 B')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '进入下一层' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^忘记/ })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '全部揭示' }))
    expect(screen.getByText('子节点 B')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^忘记/ })).toHaveClass('bg-rose-50')
    expect(screen.getByRole('button', { name: /^模糊/ })).toHaveClass('bg-amber-50')
    expect(screen.getByRole('button', { name: /^想起来了/ })).toHaveClass('bg-sky-50')
    expect(screen.getByRole('button', { name: /^熟知/ })).toHaveClass('bg-emerald-50')
  })

  it('can drill into a revealed child, go back, and persist a rating separately', () => {
    render(<RecallMode document={doc} onClose={() => undefined} />)

    fireEvent.click(screen.getByRole('button', { name: '揭示一个' }))
    fireEvent.click(screen.getByRole('button', { name: '进入下一层' }))
    expect(screen.getByRole('button', { name: '返回上一层' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '子节点 A' })).toBeInTheDocument()
    expect(screen.getByText('1 个直接子节点')).toBeInTheDocument()
    expect(screen.queryByText('孙节点 A1')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '全部揭示' }))
    fireEvent.click(screen.getByRole('button', { name: /^想起来了/ }))
    expect(window.localStorage.getItem('siwei.recall.v1')).toContain('"nodeId":"a"')

    fireEvent.click(screen.getByRole('button', { name: '返回上一层' }))
    expect(screen.getByRole('heading', { name: '父节点' })).toBeInTheDocument()
  })
})
