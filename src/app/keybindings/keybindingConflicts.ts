import { KEYBINDING_COMMANDS, COMMAND_BY_ID } from './commandRegistry'
import { getEffectiveBindings } from './keybindingMatcher'
import type { KeybindingCommandId, KeybindingOverrides } from './keybindingTypes'

export type KeybindingConflict =
  | { type: 'hard-conflict'; commandId: KeybindingCommandId }
  | { type: 'shadow-global'; commandId: KeybindingCommandId }
  | { type: 'none' }

export function findKeybindingConflict(
  commandId: KeybindingCommandId,
  chord: string,
  overrides: KeybindingOverrides,
): KeybindingConflict {
  const command = COMMAND_BY_ID.get(commandId)
  if (!command) return { type: 'none' }

  const sameScope = KEYBINDING_COMMANDS.find((candidate) =>
    candidate.id !== commandId
    && candidate.scope === command.scope
    && getEffectiveBindings(candidate.id, overrides).includes(chord),
  )
  if (sameScope) return { type: 'hard-conflict', commandId: sameScope.id }

  if (command.scope !== 'global') {
    const global = KEYBINDING_COMMANDS.find((candidate) =>
      candidate.scope === 'global'
      && getEffectiveBindings(candidate.id, overrides).includes(chord),
    )
    if (global) return { type: 'shadow-global', commandId: global.id }
  } else {
    const local = KEYBINDING_COMMANDS.find((candidate) =>
      candidate.scope !== 'global'
      && getEffectiveBindings(candidate.id, overrides).includes(chord),
    )
    if (local) return { type: 'shadow-global', commandId: local.id }
  }

  return { type: 'none' }
}
