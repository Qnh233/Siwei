import React from 'react'

import { COMMAND_BY_ID, KEYBINDING_COMMANDS } from '../../app/keybindings/commandRegistry'
import { findKeybindingConflict } from '../../app/keybindings/keybindingConflicts'
import { displayKeybinding, getEffectiveBindings, isMacPlatform, keyboardEventToKeybinding } from '../../app/keybindings/keybindingMatcher'
import type { KeybindingCommandId, KeybindingOverrides, KeybindingScope } from '../../app/keybindings/keybindingTypes'
import { toast } from '../../components/common/Toast'
import { useSettingsStore } from './settingsStore'

interface PendingConflict {
  commandId: KeybindingCommandId
  bindingIndex: number
  conflictingCommandId: KeybindingCommandId
  chord: string
}

interface CaptureTarget {
  commandId: KeybindingCommandId
  bindingIndex: number
}

const SCOPE_LABELS: Record<KeybindingScope, string> = {
  global: '通用',
  outline: '大纲',
  mindmap: '导图',
}

const SCOPE_DESCRIPTIONS: Record<KeybindingScope, string> = {
  global: '应用操作、编辑历史和视图切换',
  outline: '大纲节点的层级、移动和待办操作',
  mindmap: '导图节点的新建、层级、移动和待办操作',
}

const SCOPES: KeybindingScope[] = ['global', 'outline', 'mindmap']

function displayCommandLabel(label: string): string {
  return label.replace(/^大纲：|^思维导图：/, '')
}

export const ShortcutSettingsSection: React.FC = () => {
  const settings = useSettingsStore((state) => state.settings)
  const updateSettings = useSettingsStore((state) => state.updateSettings)
  const [query, setQuery] = React.useState('')
  const [capturing, setCapturing] = React.useState<CaptureTarget | null>(null)
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

  const applyBinding = React.useCallback((
    commandId: KeybindingCommandId,
    bindingIndex: number,
    chord: string,
    replaceId?: KeybindingCommandId,
  ) => {
    const currentOverrides = useSettingsStore.getState().settings.keybindings.overrides
    const currentBindings = getEffectiveBindings(commandId, currentOverrides)
    const nextBindings = [...currentBindings]
    if (bindingIndex < nextBindings.length) {
      nextBindings[bindingIndex] = chord
    } else {
      nextBindings.push(chord)
    }

    const overrides: KeybindingOverrides = {
      ...currentOverrides,
      [commandId]: nextBindings,
    }
    if (replaceId) {
      overrides[replaceId] = getEffectiveBindings(replaceId, currentOverrides).filter((binding) => binding !== chord)
    }
    void saveOverrides(overrides)
  }, [saveOverrides])

  const handleCapture = (
    commandId: KeybindingCommandId,
    bindingIndex: number,
    event: React.KeyboardEvent<HTMLButtonElement>,
  ) => {
    if (capturing?.commandId !== commandId || capturing.bindingIndex !== bindingIndex) return
    event.preventDefault()
    event.stopPropagation()

    if (event.key === 'Escape') {
      setCapturing(null)
      return
    }

    const chord = keyboardEventToKeybinding(event, isMac)
    if (!chord) return

    const overrides = useSettingsStore.getState().settings.keybindings.overrides
    const currentBindings = getEffectiveBindings(commandId, overrides)
    if (currentBindings.some((binding, index) => binding === chord && index !== bindingIndex)) {
      setCapturing(null)
      toast.info('该快捷键已用于当前操作')
      return
    }

    const conflict = findKeybindingConflict(commandId, chord, overrides)
    setCapturing(null)

    if (conflict.type === 'hard-conflict') {
      setPendingConflict({
        commandId,
        bindingIndex,
        conflictingCommandId: conflict.commandId,
        chord,
      })
      return
    }

    if (conflict.type === 'shadow-global') {
      const currentCommand = COMMAND_BY_ID.get(commandId)
      const conflictLabel = displayCommandLabel(COMMAND_BY_ID.get(conflict.commandId)?.label ?? '其他命令')
      toast.info(currentCommand?.scope === 'global'
        ? `“${conflictLabel}”会在对应区域优先于该全局快捷键`
        : `当前区域会优先于“${conflictLabel}”`)
    }
    applyBinding(commandId, bindingIndex, chord)
  }

  const removeBinding = (commandId: KeybindingCommandId, bindingIndex: number) => {
    const overrides = useSettingsStore.getState().settings.keybindings.overrides
    const nextBindings = getEffectiveBindings(commandId, overrides)
      .filter((_, index) => index !== bindingIndex)
    void saveOverrides({ ...overrides, [commandId]: nextBindings })
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
          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">修改常用操作；同一按键可在大纲和导图中使用不同语义。</div>
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
            {pendingConflict.chord} 已用于“{displayCommandLabel(COMMAND_BY_ID.get(pendingConflict.conflictingCommandId)?.label ?? '其他操作')}”。
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="确认替换快捷键"
              onClick={() => {
                applyBinding(
                  pendingConflict.commandId,
                  pendingConflict.bindingIndex,
                  pendingConflict.chord,
                  pendingConflict.conflictingCommandId,
                )
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

      <div className="space-y-3 p-3">
        {SCOPES.map((scope) => {
          const commands = filteredCommands.filter((command) => command.scope === scope)
          if (commands.length === 0) return null

          return (
            <details
              key={scope}
              open
              role="region"
              aria-label={`${SCOPE_LABELS[scope]}快捷键`}
              className="overflow-hidden rounded-md border border-zinc-200 bg-zinc-50/60 dark:border-zinc-800 dark:bg-zinc-950/40"
            >
              <summary className="cursor-pointer select-none px-3 py-2.5">
                <div className="inline-flex flex-col align-middle">
                  <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{SCOPE_LABELS[scope]}</span>
                  <span className="mt-0.5 text-[11px] text-zinc-400">{SCOPE_DESCRIPTIONS[scope]}</span>
                </div>
              </summary>
              <div className="divide-y divide-zinc-100 border-t border-zinc-100 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900/60">
                {commands.map((command) => {
                  const bindings = getEffectiveBindings(command.id, settings.keybindings.overrides)
                  const isOverridden = Object.prototype.hasOwnProperty.call(settings.keybindings.overrides, command.id)
                  const label = displayCommandLabel(command.label)
                  return (
                    <div key={command.id} className="grid gap-3 px-3 py-3 md:grid-cols-[1fr_auto] md:items-center">
                      <div className="text-sm font-medium text-zinc-800 dark:text-zinc-100">{label}</div>
                      <div
                        role="group"
                        aria-label={`${label}快捷键`}
                        className="flex flex-wrap items-center gap-2 md:justify-end"
                      >
                        {bindings.map((binding, bindingIndex) => (
                          <React.Fragment key={`${command.id}-${bindingIndex}`}>
                            {bindingIndex > 0 && <span className="text-[11px] text-zinc-400">或</span>}
                            <div className="inline-flex overflow-hidden rounded-md border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950">
                              <button
                                type="button"
                                aria-label={`编辑${label}快捷键 ${bindingIndex + 1}`}
                                onClick={() => {
                                  setPendingConflict(null)
                                  setCapturing({ commandId: command.id, bindingIndex })
                                }}
                                onKeyDown={(event) => handleCapture(command.id, bindingIndex, event)}
                                className="min-w-20 px-2.5 py-1.5 text-xs font-medium text-zinc-700 outline-none focus:bg-white dark:text-zinc-200 dark:focus:bg-zinc-900"
                              >
                                {capturing?.commandId === command.id && capturing.bindingIndex === bindingIndex
                                  ? '按下快捷键…'
                                  : displayKeybinding(binding, isMac)}
                              </button>
                              <button
                                type="button"
                                aria-label={`删除${label}快捷键 ${bindingIndex + 1}`}
                                onClick={() => removeBinding(command.id, bindingIndex)}
                                className="border-l border-zinc-200 px-2 text-xs text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:border-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                              >
                                ×
                              </button>
                            </div>
                          </React.Fragment>
                        ))}
                        <button
                          type="button"
                          aria-label={`为${label}添加快捷键`}
                          onClick={() => {
                            setPendingConflict(null)
                            setCapturing({ commandId: command.id, bindingIndex: bindings.length })
                          }}
                          onKeyDown={(event) => handleCapture(command.id, bindings.length, event)}
                          className="rounded-md border border-dashed border-zinc-300 px-2.5 py-1.5 text-xs text-zinc-500 outline-none hover:border-zinc-400 hover:text-zinc-700 focus:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                        >
                          {capturing?.commandId === command.id && capturing.bindingIndex === bindings.length
                            ? '按下快捷键…'
                            : bindings.length === 0 ? '添加快捷键' : '+ 添加'}
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
            </details>
          )
        })}
      </div>
    </section>
  )
}
