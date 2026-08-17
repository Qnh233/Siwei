import React from 'react'

import { COMMAND_BY_ID, KEYBINDING_COMMANDS } from '../../app/keybindings/commandRegistry'
import { findKeybindingConflict } from '../../app/keybindings/keybindingConflicts'
import { displayKeybinding, getEffectiveBindings, isMacPlatform, keyboardEventToKeybinding } from '../../app/keybindings/keybindingMatcher'
import type { KeybindingCommandId, KeybindingOverrides, KeybindingScope } from '../../app/keybindings/keybindingTypes'
import { toast } from '../../components/common/Toast'
import { useSettingsStore } from './settingsStore'

interface PendingConflict {
  commandId: KeybindingCommandId
  conflictingCommandId: KeybindingCommandId
  chord: string
}

const SCOPE_LABELS: Record<KeybindingScope, string> = {
  global: '通用',
  outline: '大纲',
  mindmap: '思维导图',
}

export const ShortcutSettingsSection: React.FC = () => {
  const settings = useSettingsStore((state) => state.settings)
  const updateSettings = useSettingsStore((state) => state.updateSettings)
  const [query, setQuery] = React.useState('')
  const [capturing, setCapturing] = React.useState<KeybindingCommandId | null>(null)
  const [pendingConflict, setPendingConflict] = React.useState<PendingConflict | null>(null)
  const isMac = isMacPlatform()

  const filteredCommands = React.useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return KEYBINDING_COMMANDS
    return KEYBINDING_COMMANDS.filter((command) => {
      const bindings = getEffectiveBindings(command.id, settings.keybindings.overrides).join(' ')
      return `${command.label} ${bindings}`.toLowerCase().includes(normalized)
    })
  }, [query, settings.keybindings.overrides])

  const saveOverrides = React.useCallback(async (overrides: KeybindingOverrides) => {
    try {
      await updateSettings({ keybindings: { overrides } })
      toast.success('快捷键已保存')
    } catch (error) {
      toast.error(`快捷键保存失败: ${String(error)}`)
    }
  }, [updateSettings])

  const applyBinding = React.useCallback((commandId: KeybindingCommandId, chord: string, replaceId?: KeybindingCommandId) => {
    const currentOverrides = useSettingsStore.getState().settings.keybindings.overrides
    const overrides: KeybindingOverrides = {
      ...currentOverrides,
      [commandId]: [chord],
    }
    if (replaceId) {
      overrides[replaceId] = getEffectiveBindings(replaceId, currentOverrides).filter((binding) => binding !== chord)
    }
    void saveOverrides(overrides)
  }, [saveOverrides])

  const handleCapture = (commandId: KeybindingCommandId, event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (capturing !== commandId) return
    event.preventDefault()
    event.stopPropagation()

    if (event.key === 'Escape') {
      setCapturing(null)
      return
    }

    const chord = keyboardEventToKeybinding(event, isMac)
    if (!chord) return

    const overrides = useSettingsStore.getState().settings.keybindings.overrides
    const conflict = findKeybindingConflict(commandId, chord, overrides)
    setCapturing(null)

    if (conflict.type === 'hard-conflict') {
      setPendingConflict({
        commandId,
        conflictingCommandId: conflict.commandId,
        chord,
      })
      return
    }

    if (conflict.type === 'shadow-global') {
      const currentCommand = COMMAND_BY_ID.get(commandId)
      const conflictLabel = COMMAND_BY_ID.get(conflict.commandId)?.label ?? conflict.commandId
      toast.info(currentCommand?.scope === 'global'
        ? `“${conflictLabel}”会在对应区域优先于该全局快捷键`
        : `当前区域会优先于“${conflictLabel}”`)
    }
    applyBinding(commandId, chord)
  }

  const restoreCommand = (commandId: KeybindingCommandId) => {
    const overrides = { ...settings.keybindings.overrides }
    delete overrides[commandId]
    void saveOverrides(overrides)
  }

  return (
    <section className="rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
        <div>
          <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">快捷键</div>
          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">修改常用命令；同一按键可在大纲和思维导图中使用不同语义。</div>
        </div>
        <div className="flex items-center gap-2">
          <input
            aria-label="搜索快捷键"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索命令或按键"
            className="h-8 w-44 rounded-md border border-zinc-200 bg-white px-2 text-xs outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950"
          />
          <button
            type="button"
            onClick={() => void saveOverrides({})}
            className="h-8 rounded-md border border-zinc-200 px-2.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            全部恢复默认
          </button>
        </div>
      </div>

      {pendingConflict && (
        <div role="alert" className="mx-4 mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          <span>
            {pendingConflict.chord} 已用于“{COMMAND_BY_ID.get(pendingConflict.conflictingCommandId)?.label}”。
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="确认替换快捷键"
              onClick={() => {
                applyBinding(pendingConflict.commandId, pendingConflict.chord, pendingConflict.conflictingCommandId)
                setPendingConflict(null)
              }}
              className="font-semibold underline underline-offset-2"
            >
              替换
            </button>
            <button type="button" onClick={() => setPendingConflict(null)}>取消</button>
          </div>
        </div>
      )}

      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {filteredCommands.map((command) => {
          const bindings = getEffectiveBindings(command.id, settings.keybindings.overrides)
          const isOverridden = Object.prototype.hasOwnProperty.call(settings.keybindings.overrides, command.id)
          return (
            <div key={command.id} className="grid gap-3 px-4 py-3 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <div className="text-sm font-medium text-zinc-800 dark:text-zinc-100">{command.label}</div>
                <div className="mt-1 text-[11px] text-zinc-400">{SCOPE_LABELS[command.scope]} · {command.id}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2 md:justify-end">
                <button
                  type="button"
                  aria-label={`编辑快捷键：${command.label}`}
                  onClick={() => {
                    setPendingConflict(null)
                    setCapturing(command.id)
                  }}
                  onKeyDown={(event) => handleCapture(command.id, event)}
                  className="min-w-24 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs font-medium text-zinc-700 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
                >
                  {capturing === command.id
                    ? '按下快捷键…'
                    : bindings.length > 0
                      ? bindings.map((binding) => displayKeybinding(binding, isMac)).join(' / ')
                      : '未绑定'}
                </button>
                <button
                  type="button"
                  onClick={() => void saveOverrides({ ...settings.keybindings.overrides, [command.id]: [] })}
                  className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                >
                  清除
                </button>
                <button
                  type="button"
                  disabled={!isOverridden}
                  onClick={() => restoreCommand(command.id)}
                  className="text-xs text-zinc-500 hover:text-zinc-800 disabled:opacity-30 dark:hover:text-zinc-200"
                >
                  恢复默认
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
