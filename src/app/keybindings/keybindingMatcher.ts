import { COMMAND_BY_ID, commandsForScope } from './commandRegistry'
import type {
  KeybindingCommand,
  KeybindingCommandId,
  KeybindingOverrides,
  KeybindingScope,
} from './keybindingTypes'

type KeyboardLikeEvent = Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>

const MODIFIER_KEYS = new Set(['Control', 'Meta', 'Alt', 'Shift'])

export function isMacPlatform(): boolean {
  return typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform)
}

function canonicalKey(key: string): string {
  if (key.length === 1 && /[a-z]/i.test(key)) return key.toUpperCase()
  return key === ' ' ? 'Space' : key
}

export function keyboardEventToKeybinding(
  event: KeyboardLikeEvent,
  isMac = isMacPlatform(),
): string | null {
  if (MODIFIER_KEYS.has(event.key)) return null

  const parts: string[] = []
  const hasPrimaryMod = isMac ? event.metaKey : event.ctrlKey
  if (hasPrimaryMod) parts.push('Mod')
  if (isMac && event.ctrlKey) parts.push('Ctrl')
  if (!isMac && event.metaKey) parts.push('Meta')
  if (event.altKey) parts.push('Alt')
  if (event.shiftKey) parts.push('Shift')
  parts.push(canonicalKey(event.key))
  return parts.join('+')
}

export function displayKeybinding(binding: string, isMac = isMacPlatform()): string {
  return binding.replace('Mod', isMac ? '⌘' : 'Ctrl')
}

export function getEffectiveBindings(
  commandId: KeybindingCommandId,
  overrides: KeybindingOverrides,
): string[] {
  if (Object.prototype.hasOwnProperty.call(overrides, commandId)) {
    return overrides[commandId] ?? []
  }
  return COMMAND_BY_ID.get(commandId)?.defaultKeys ?? []
}

export function findKeybindingCommand(
  scope: KeybindingScope,
  event: KeyboardLikeEvent,
  overrides: KeybindingOverrides,
  isMac = isMacPlatform(),
): KeybindingCommand | null {
  const chord = keyboardEventToKeybinding(event, isMac)
  if (!chord) return null

  return commandsForScope(scope).find((command) => getEffectiveBindings(command.id, overrides).includes(chord)) ?? null
}
