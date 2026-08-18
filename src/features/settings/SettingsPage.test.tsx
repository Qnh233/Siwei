import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useLibraryStore } from '../library/libraryStore'
import { useRecentStore } from '../document/recentStore'
import { useWorkspaceStore } from '../../app/workspaceStore'
import { useSettingsStore } from './settingsStore'
import { SettingsPage } from './SettingsPage'
import type { AppSettings } from '../../types/settings'

const baseSettings: AppSettings = {
  autoSaveEnabled: true,
  autoSaveIntervalMs: 1500,
  defaultViewMode: 'outline',
  sidebarCollapsed: false,
  theme: 'system',
  focusMode: false,
  experimentalMindMapLayoutEngine: false,
  keybindings: { overrides: {} },
  agent: {
    enabled: false,
    provider: 'openai-compatible',
    model: 'gpt-4.1',
    baseUrl: 'https://api.openai.com/v1',
    thinkingLevel: 'medium',
    contextScope: 'currentDocument',
  },
}

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useSettingsStore.setState({
      settings: baseSettings,
      isLoaded: true,
      isSaving: false,
      error: null,
    })
    useRecentStore.setState({
      recentDocs: [
        { path: 'a.siwei.json', title: 'A', lastOpenedAt: 1 },
        { path: 'b.siwei.json', title: 'B', lastOpenedAt: 2 },
      ],
    })
    useLibraryStore.setState({
      isLoading: false,
      error: null,
    })
    useWorkspaceStore.setState({ activeView: 'settings' })
  })

  it('updates auto-save and default view settings from controls', async () => {
    const updateSettings = vi.spyOn(useSettingsStore.getState(), 'updateSettings')
      .mockImplementation(async (patch) => {
        useSettingsStore.setState((state) => ({ settings: { ...state.settings, ...patch } }))
      })

    render(<SettingsPage />)

    fireEvent.click(screen.getByLabelText('已开启'))
    fireEvent.click(screen.getByRole('button', { name: '导图' }))

    await waitFor(() => {
      expect(updateSettings).toHaveBeenCalledWith({ autoSaveEnabled: false })
      expect(updateSettings).toHaveBeenCalledWith({ defaultViewMode: 'mindmap' })
    })

    updateSettings.mockRestore()
  })

  it('updates theme and focus mode from interface controls', async () => {
    const updateSettings = vi.spyOn(useSettingsStore.getState(), 'updateSettings')
      .mockImplementation(async (patch) => {
        useSettingsStore.setState((state) => ({ settings: { ...state.settings, ...patch } }))
      })

    render(<SettingsPage />)

    fireEvent.click(screen.getByRole('button', { name: '深色' }))
    fireEvent.click(screen.getByRole('button', { name: '开启' }))

    await waitFor(() => {
      expect(updateSettings).toHaveBeenCalledWith({ theme: 'dark' })
      expect(updateSettings).toHaveBeenCalledWith({ focusMode: true })
    })

    updateSettings.mockRestore()
  })

  it('updates the experimental mind map layout engine flag', async () => {
    const updateSettings = vi.spyOn(useSettingsStore.getState(), 'updateSettings')
      .mockImplementation(async (patch) => {
        useSettingsStore.setState((state) => ({ settings: { ...state.settings, ...patch } }))
      })

    render(<SettingsPage />)

    fireEvent.click(screen.getByLabelText('启用实验性导图布局引擎'))

    await waitFor(() => {
      expect(updateSettings).toHaveBeenCalledWith({ experimentalMindMapLayoutEngine: true })
    })

    updateSettings.mockRestore()
  })

  it('records a custom shortcut and explicitly replaces same-scope conflicts', async () => {
    const updateSettings = vi.spyOn(useSettingsStore.getState(), 'updateSettings')
      .mockImplementation(async (patch) => {
        useSettingsStore.setState((state) => ({ settings: { ...state.settings, ...patch } }))
      })

    render(<SettingsPage />)

    const capture = screen.getByRole('button', { name: '编辑新增子节点快捷键 1' })
    fireEvent.click(capture)
    fireEvent.keyDown(capture, { key: 'Tab' })

    expect(screen.getByRole('alert')).toHaveTextContent('缩进')
    fireEvent.click(screen.getByRole('button', { name: '确认替换快捷键' }))

    await waitFor(() => {
      expect(updateSettings).toHaveBeenCalledWith({
        keybindings: {
          overrides: {
            'mindmap.insertChild': ['Tab'],
            'mindmap.indent': [],
          },
        },
      })
    })

    updateSettings.mockRestore()
  })

  it('edits alternative shortcuts independently for one command', async () => {
    const updateSettings = vi.spyOn(useSettingsStore.getState(), 'updateSettings')
      .mockImplementation(async (patch) => {
        useSettingsStore.setState((state) => ({ settings: { ...state.settings, ...patch } }))
      })

    render(<SettingsPage />)

    const focusMode = screen.getByRole('group', { name: '专注模式快捷键' })
    expect(within(focusMode).getByText('或')).toBeInTheDocument()
    expect(within(focusMode).getByRole('button', { name: '编辑专注模式快捷键 1' })).toHaveTextContent('F11')
    expect(within(focusMode).getByRole('button', { name: '编辑专注模式快捷键 2' })).toHaveTextContent('Ctrl+\\')

    const first = within(focusMode).getByRole('button', { name: '编辑专注模式快捷键 1' })
    fireEvent.click(first)
    fireEvent.keyDown(first, { key: 'F10' })

    await waitFor(() => {
      expect(updateSettings).toHaveBeenCalledWith({
        keybindings: { overrides: { 'view.focusMode': ['F10', 'Mod+\\'] } },
      })
    })

    const second = within(focusMode).getByRole('button', { name: '编辑专注模式快捷键 2' })
    fireEvent.click(second)
    fireEvent.keyDown(second, { key: '9', altKey: true })

    await waitFor(() => {
      expect(updateSettings).toHaveBeenCalledWith({
        keybindings: { overrides: { 'view.focusMode': ['F10', 'Alt+9'] } },
      })
    })

    const add = within(focusMode).getByRole('button', { name: '为专注模式添加快捷键' })
    fireEvent.click(add)
    fireEvent.keyDown(add, { key: 'F9' })

    await waitFor(() => {
      expect(updateSettings).toHaveBeenCalledWith({
        keybindings: { overrides: { 'view.focusMode': ['F10', 'Alt+9', 'F9'] } },
      })
    })

    fireEvent.click(within(focusMode).getByRole('button', { name: '删除专注模式快捷键 2' }))
    await waitFor(() => {
      expect(updateSettings).toHaveBeenCalledWith({
        keybindings: { overrides: { 'view.focusMode': ['F10', 'F9'] } },
      })
    })

    updateSettings.mockRestore()
  })

  it('groups shortcut settings into Chinese-only common, outline, and mind map panels', () => {
    render(<SettingsPage />)

    const common = screen.getByRole('region', { name: '通用快捷键' })
    const outline = screen.getByRole('region', { name: '大纲快捷键' })
    const mindMap = screen.getByRole('region', { name: '导图快捷键' })

    expect(within(common).getByText('保存')).toBeInTheDocument()
    expect(within(outline).getByText('缩进')).toBeInTheDocument()
    expect(within(mindMap).getByText('新增子节点')).toBeInTheDocument()
    expect(screen.queryByText('app.save')).not.toBeInTheDocument()
    expect(screen.queryByText('outline.indent')).not.toBeInTheDocument()
    expect(screen.queryByText('mindmap.insertChild')).not.toBeInTheDocument()
  })

  it('runs data maintenance actions through existing stores', async () => {
    const removeRecent = vi.spyOn(useRecentStore.getState(), 'removeRecent').mockResolvedValue(undefined)
    const loadRecents = vi.spyOn(useRecentStore.getState(), 'loadRecents').mockResolvedValue(undefined)
    const rebuildIndex = vi.spyOn(useLibraryStore.getState(), 'rebuildIndex').mockResolvedValue(undefined)

    render(<SettingsPage />)

    fireEvent.click(screen.getByRole('button', { name: /清空最近记录/ }))
    fireEvent.click(screen.getByRole('button', { name: /重建索引/ }))

    await waitFor(() => {
      expect(removeRecent).toHaveBeenCalledWith('a.siwei.json')
      expect(removeRecent).toHaveBeenCalledWith('b.siwei.json')
      expect(loadRecents).toHaveBeenCalled()
      expect(rebuildIndex).toHaveBeenCalled()
    })

    removeRecent.mockRestore()
    loadRecents.mockRestore()
    rebuildIndex.mockRestore()
  })

  it('returns to the editor when closing settings', () => {
    render(<SettingsPage />)

    fireEvent.click(screen.getByRole('button', { name: '关闭设置' }))

    expect(useWorkspaceStore.getState().activeView).toBe('editor')
  })
})
